export type Role = 'client' | 'dietician';

export interface Profile {
  id: string;
  role: Role;
  display_name: string | null;
  created_at: string;
}
