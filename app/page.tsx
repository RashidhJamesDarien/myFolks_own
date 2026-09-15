"use client";

import React, { useState } from "react";

import { supabase } from "@/src/lib/supabase";
import AuthScreen from "@/components/auth/AuthScreen";

import { AuthLoadingScreen } from "@/components/home/AuthLoadingScreen";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { CompletionModal } from "@/components/home/CompletionModal";
import { ConfirmDialog } from "@/components/home/ConfirmDialog";

import { DiscoverView } from "@/components/home/discover";
import { FriendsView } from "@/components/home/friends";
import { MessagesView } from "@/components/home/messages";
import { CreateProfileView } from "@/components/home/create-profile";
import { ProfileView } from "@/components/home/profile";
import { SettingsView } from "@/components/home/settings";

import { useTheme } from "@/components/home/hooks/useTheme";
import { useSupabaseAuth } from "@/components/home/hooks/useSupabaseAuth";
import { useCurrentProfile } from "@/components/home/hooks/useCurrentProfile";
import { useDiscovery } from "@/components/home/hooks/useDiscovery";
import { useRelationships } from "@/components/home/hooks/useRelationships";
import { useMessaging } from "@/components/home/hooks/useMessaging";

import {
  useProfileCreator,
  useProfileEditor,
} from "@/components/home/hooks/useProfileEditor";

import { API, DEFAULT_SETTINGS } from "@/components/home/constants";
import { apiRequest } from "@/components/home/utils";

import type {
  ConfirmDialogState,
  Profile,
  Settings,
  StatusValue,
  View,
} from "@/components/home/types";

export default function Home() {
  const [view, setView] = useState<View>("discover");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<ConfirmDialogState>(null);

  const [blockedProfiles, setBlockedProfiles] = useState<
    Set<string>
  >(new Set());

  const [settings, setSettings] = useState<Settings>(
    DEFAULT_SETTINGS,
  );

  const [settingsStatus, setSettingsStatus] =
    useState<StatusValue>(null);

  const [friendSearch, setFriendSearch] = useState("");

  const theme = useTheme();

  const { authLoading, authenticated, backendConnected } =
    useSupabaseAuth();

  const {
    currentProfile,
    setCurrentProfile,
    profileConfirmed,
    setProfileConfirmed,
    resetProfile,
  } = useCurrentProfile(authenticated);

  const discovery = useDiscovery({
    authenticated,
    backendConnected,
    currentProfileId: currentProfile?.profile_id,
    blockedProfiles,
  });

  const relationships = useRelationships({
    authenticated,
    backendConnected,
  });

  const messaging = useMessaging({
    backendConnected,
    isAcceptedFriend: relationships.isAcceptedFriend,
  });

  const showView = (nextView: View) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  const profileCreator = useProfileCreator({
    backendConnected,
    onCreated: (profile) => {
      setCurrentProfile(profile);
      setProfileConfirmed(true);
      discovery.refresh();
      showView("profile");
    },
  });

  const profileEditor = useProfileEditor({
    currentProfile,
    onSaved: (profile) => {
      setCurrentProfile(profile);
      discovery.refresh();
    },
  });

  /** Reload friends, request statuses, and the discovery pool. */
  const refreshRelationshipData = async () => {
    await relationships.loadFriendRequestStatuses();
    await relationships.loadFriends();

    discovery.refresh();
  };

  const openConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) => setDialog({ title, message, action });

  const reportProfile = async (profile: Profile) => {
    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.reports, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_profile_id: profile.profile_id,
        }),
      });

      discovery.setNotice({
        text: "Report submitted for review.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to report profile:", error);

      discovery.setNotice({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "The report could not be saved remotely.",
        type: "error",
      });
    }
  };

  const blockProfile = async (profile: Profile) => {
    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.blocks, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocked_profile_id: profile.profile_id,
        }),
      });

      setBlockedProfiles((previous) => {
        const next = new Set(previous);

        next.add(profile.profile_id);

        return next;
      });

      discovery.setNotice({
        text: "Profile blocked.",
        type: "success",
      });

      discovery.restartDiscovery();
      showView("discover");
    } catch (error) {
      console.error("Failed to block profile:", error);

      discovery.setNotice({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "The block could not be saved remotely.",
        type: "error",
      });
    }
  };

  const addCompletionFriend = async () => {
    const profile = discovery.completionProfile;

    if (!profile) return;

    const { error } = await relationships.sendFriendRequest(
      profile.profile_id,
    );

    if (error) {
      discovery.setNotice({ text: error, type: "error" });
      return;
    }

    discovery.restartDiscovery();
    showView("discover");
  };

  /** Open a conversation, explaining why when it isn't allowed. */
  const openConversation = (profile: Profile) => {
    if (!relationships.isAcceptedFriend(profile.profile_id)) {
      discovery.setNotice({
        text: "You can message this person after they accept your friend request.",
        type: "info",
      });

      return;
    }

    if (profile.allows_messages === false) {
      discovery.setNotice({
        text: "This person is not accepting messages right now.",
        type: "info",
      });

      return;
    }

    messaging.openConversation(profile);
    discovery.setCompletionProfile(null);
    showView("messages");
  };

  const saveSettings = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      if (!backendConnected) {
        throw new Error("backend_unavailable");
      }

      await apiRequest(API.settings, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibility: settings.visibility,
          profile_interest_display: settings.interestDisplay
            ? "shown"
            : "hidden",
          message_permission: settings.messagePermission,
          last_seen_visibility: settings.lastSeenVisibility,
          friend_request_notifications:
            settings.friendNotifications,
          message_notifications: settings.messageNotifications,
        }),
      });

      setSettingsStatus({
        text: "Settings saved.",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);

      setSettingsStatus({
        text:
          error instanceof Error &&
          error.message !== "backend_unavailable"
            ? error.message
            : "Settings could not be saved remotely. Your current choices remain on this device.",
        type: "error",
      });
    }
  };

  /** Clear every piece of signed-in state. */
  const resetSession = () => {
    resetProfile();
    discovery.reset();
    relationships.reset();
    messaging.reset();
    profileEditor.setEditing(false);
    setBlockedProfiles(new Set());
    setView("discover");
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      resetSession();
    } catch (error) {
      console.error("Failed to sign out:", error);

      setSettingsStatus({
        text:
          error instanceof Error
            ? error.message
            : "Sign out could not be completed.",
        type: "error",
      });
    }
  };

  const deleteAccount = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired.");
      }

      const response = await fetch(API.accountDelete, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        let message = "Your account could not be deleted.";

        try {
          const data = (await response.json()) as {
            error?: unknown;
          };

          if (typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // Ignore invalid JSON error responses.
        }

        throw new Error(message);
      }

      await supabase.auth.signOut();

      resetSession();
    } catch (error) {
      console.error("Failed to delete account:", error);

      setSettingsStatus({
        text:
          error instanceof Error
            ? error.message
            : "Your account could not be deleted. Please try again.",
        type: "error",
      });
    }
  };

  const confirmSignOut = () =>
    openConfirmation(
      "Sign out of myFolks?",
      "You will be signed out on this device.",
      signOut,
    );

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!authenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="app-shell grain">
      <SiteHeader
        view={view}
        darkMode={theme.darkMode}
        themeAnimating={theme.themeAnimating}
        mobileMenuOpen={mobileMenuOpen}
        profileConfirmed={profileConfirmed}
        onNavigate={showView}
        onToggleMobileMenu={() =>
          setMobileMenuOpen((value) => !value)
        }
        onToggleTheme={theme.toggleTheme}
      />

      <main className="main-content">
        {view === "discover" && (
          <DiscoverView
            profiles={discovery.profiles}
            currentPair={discovery.currentPair}
            discoverState={discovery.discoverState}
            progressCurrent={discovery.progressCurrent}
            progressTotal={discovery.progressTotal}
            progressPercent={discovery.progressPercent}
            positiveSelections={discovery.positiveSelections}
            visibleProfilesCount={
              discovery.visibleProfilesCount
            }
            notice={discovery.notice}
            onChoose={discovery.chooseInterest}
            onSkip={discovery.skipPair}
            onReport={reportProfile}
            onBlock={(profile) =>
              openConfirmation(
                "Block this person?",
                "They will no longer appear in your discovery session.",
                () => blockProfile(profile),
              )
            }
            onRetry={discovery.restartDiscovery}
          />
        )}

        {view === "friends" && (
          <FriendsView
            friends={relationships.friends}
            search={friendSearch}
            onSearch={setFriendSearch}
            onOpenMessage={openConversation}
            onRequestsChanged={refreshRelationshipData}
          />
        )}

        {view === "messages" && (
          <MessagesView
            friends={relationships.friends}
            activeProfile={messaging.activeProfile}
            mobileOpen={messaging.open}
            messageText={messaging.text}
            messageAsset={messaging.asset}
            messageStatus={messaging.status}
            messageSending={messaging.sending}
            messageCount={messaging.count}
            fileInputRef={messaging.fileInputRef}
            onSelect={messaging.openConversation}
            onBack={() => messaging.setOpen(false)}
            onTextChange={messaging.changeText}
            onFile={messaging.chooseAsset}
            onRemoveAsset={messaging.removeAsset}
            onSend={messaging.sendMessage}
          />
        )}

        {view === "create" && (
          <CreateProfileView
            profilePhoto={profileCreator.photoFile}
            profilePhotoUrl={profileCreator.photoUrl}
            status={profileCreator.photoStatus}
            formStatus={profileCreator.formStatus}
            onPhoto={profileCreator.choosePhoto}
            onRemovePhoto={profileCreator.removePhoto}
            onSubmit={profileCreator.submit}
          />
        )}

        {view === "profile" && (
          <ProfileView
            profile={currentProfile}
            editing={profileEditor.editing}
            editFullName={profileEditor.fullName}
            editUsername={profileEditor.username}
            editBio={profileEditor.bio}
            editLocation={profileEditor.location}
            editInterests={profileEditor.interests}
            editCustomInterest={profileEditor.customInterest}
            editProfilePhotoUrl={profileEditor.photoUrl}
            editProfileStatus={profileEditor.status}
            editProfileSaving={profileEditor.saving}
            onStartEdit={profileEditor.begin}
            onCancelEdit={profileEditor.cancel}
            onFullNameChange={profileEditor.setFullName}
            onUsernameChange={profileEditor.setUsername}
            onBioChange={profileEditor.setBio}
            onLocationChange={profileEditor.setLocation}
            onToggleInterest={profileEditor.toggleInterest}
            onCustomInterestChange={
              profileEditor.setCustomInterest
            }
            onPhoto={profileEditor.choosePhoto}
            onRemovePhoto={profileEditor.removePhoto}
            onSave={profileEditor.save}
            onSignOut={confirmSignOut}
          />
        )}

        {view === "settings" && (
          <SettingsView
            settings={settings}
            status={settingsStatus}
            blockedCount={blockedProfiles.size}
            onChange={setSettings}
            onSave={saveSettings}
            onDelete={() =>
              openConfirmation(
                "Delete your account?",
                "This will permanently delete your myFolks account and associated profile data. This action cannot be undone.",
                deleteAccount,
              )
            }
            onSignOut={confirmSignOut}
          />
        )}
      </main>

      <SiteFooter />

      {discovery.completionProfile && (
        <CompletionModal
          profile={discovery.completionProfile}
          requestStatus={relationships.getStatus(
            discovery.completionProfile.profile_id,
          )}
          onAddFriend={addCompletionFriend}
          onSendMessage={() =>
            openConversation(discovery.completionProfile!)
          }
          onContinue={discovery.restartDiscovery}
        />
      )}

      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            const action = dialog.action;

            setDialog(null);

            if (action) await action();
          }}
        />
      )}
    </div>
  );
}
