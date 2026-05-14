// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
}

// ---------------------------------------------------------------------------
// Users (public profile — no email, used in group member lists)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface GroupMember {
  id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user: Pick<User, "id" | "display_name" | "avatar_url">;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
}

export interface GroupList {
  data: Group[];
  count: number;
}

// ---------------------------------------------------------------------------
// Festivals
// ---------------------------------------------------------------------------

export interface Festival {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  slug: string;
}

export interface FestivalList {
  data: Festival[];
  count: number;
}

export interface Stage {
  id: string;
  name: string;
  description: string | null;
}

export interface Artist {
  id: string;
  name: string;
  genre: string | null;
  image_url: string | null;
  spotify_id: string | null;
}

export interface ArtistSpotifyResponse {
  spotify_id: string | null;
}

export interface Performance {
  id: string;
  festival_id: string;
  stage_id: string;
  artist_id: string;
  // Null when the lineup has been announced but set-times haven't dropped yet.
  // UI renders TBD; conflict detection skips them.
  start_time: string | null;
  end_time: string | null;
  stage: Stage;
  artist: Artist;
}

export interface FestivalSchedule {
  festival: Festival;
  performances: Performance[];
}

// ---------------------------------------------------------------------------
// Group-festival links
// ---------------------------------------------------------------------------

export interface GroupFestival {
  id: string;
  group_id: string;
  festival_id: string;
  linked_at: string;
  festival: Festival;
}

export interface GroupFestivalList {
  data: GroupFestival[];
  count: number;
}

// ---------------------------------------------------------------------------
// User schedules
// ---------------------------------------------------------------------------

export type ScheduleStatus = "attending" | "maybe" | "skipping";

export interface ScheduleUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface UserSchedule {
  id: string;
  user_id: string;
  performance_id: string;
  status: ScheduleStatus;
  updated_at: string;
  user: ScheduleUser;
}

export interface ScheduleList {
  data: UserSchedule[];
  count: number;
}

export interface PollResponse {
  data: UserSchedule[];
  count: number;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface InvitationGroup {
  id: string;
  name: string;
}

export interface Invitation {
  id: string;
  group_id: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
  group: InvitationGroup;
}

export interface InvitationAcceptResponse {
  group_id: string;
  group: InvitationGroup;
}
