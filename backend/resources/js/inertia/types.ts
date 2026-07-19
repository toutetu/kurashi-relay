import type { ApiTask, Member, RewardSummary } from "@/api/schemas/oshigotoSchema";

export type SharedAppProps = {
  name: string;
  timezone: string;
  inertiaPrefix: string;
};

export type SharedPageProps = {
  app: SharedAppProps;
  flash: {
    status?: string | null;
  };
  auth?: {
    mode: "session";
    verified: boolean;
  };
};

export type MemberRecordsPayload = {
  date: string;
  member: Member;
  tasks: ApiTask[];
  summary: RewardSummary;
};

export type RecordsPageProps = SharedPageProps & {
  date: string;
  today: string;
  child: MemberRecordsPayload;
  mother: MemberRecordsPayload;
};

export type WelcomePageProps = SharedPageProps & {
  recordsPath: string;
};

export type FamilyTokenPageProps = SharedPageProps & {
  intendedUrl: string;
};
