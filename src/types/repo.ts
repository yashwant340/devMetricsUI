export interface Repo {
  id: string;
  fullName: string;
  name: string;
  ownerLogin: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  defaultBranch: string;
  isPrivate: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  owner: { login: string };
  updated_at: string;
}