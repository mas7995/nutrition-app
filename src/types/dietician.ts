import { Profile } from './profile';

export type LinkStatus = 'pending' | 'active' | 'revoked';

export interface DieticianLink {
  id: string;
  dietician_id: string;
  client_id: string;
  status: LinkStatus;
  created_at: string;
}

export interface AdherenceGlance {
  green: number;
  amber: number;
  red: number;
  total: number;
}

/** A dietician's view of one linked client. */
export interface LinkedClient {
  link: DieticianLink;
  profile: Profile | null;
  adherence: AdherenceGlance;
}

/** A client's view of one linked dietician. */
export interface LinkedDietician {
  link: DieticianLink;
  profile: Profile | null;
}

export interface Note {
  id: string;
  author_id: string;
  client_id: string;
  food_log_id: string | null;
  body: string;
  created_at: string;
}
