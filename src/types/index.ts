export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'wont_do';
export type Theme = 'light' | 'dark' | 'system';
export type SortOption = 'dueDate' | 'priority' | 'subject' | 'createdAt';
export type RecurringInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type RecurringEnd = 'forever' | 'count' | 'date';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  startDate: string | null;
  subTasks: SubTask[];
  tags: string[];
  recurring: boolean;
  recurringInterval: RecurringInterval | null;
  recurringEnd: RecurringEnd;
  recurringEndCount: number | null;
  recurringEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'pdf' | 'file';
  fileName?: string;
  fileData?: string; // base64 for images/files
  fileMimeType?: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  abbreviation?: string;
  color: string;
  icon: string;
  description: string;
  createdAt: string;
}

export interface Settings {
  theme: Theme;
  upcomingDays: number;
  defaultSort: SortOption;
  showDoneTasks: boolean;
  language: string;
  abbreviationPrefix: boolean;
}

export interface TimetableEntry {
  id: string;
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday … 6 = Sunday
  period: number; // 1–8
  startTime: string; // "08:00" – derived from period or custom
  endTime: string;   // "08:45"
  title: string;
  subjectId?: string | null;
  room?: string;
  teacher?: string;
  color?: string;
  createdAt: string;
}

export interface AppData {
  subjects: Subject[];
  tasks: Task[];
  notes: Note[];
  settings: Settings;
  timetable: TimetableEntry[];
}
