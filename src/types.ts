export type Course = {
  COURSE_ID: string;
  COURSE_TITLE: string;
  COURSE_DESCRIPTION: string;
};

export type Reply = {
  content: string;
  role: "system" | "user" | "assistant";
};
