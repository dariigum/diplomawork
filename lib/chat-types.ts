export interface ChatMessageView {
  id: string;
  responseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'EMPLOYEE' | 'EMPLOYER';
  recipientId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface EmployeeChatThread {
  responseId: string;
  vacancyId: string;
  vacancyTitle: string;
  salaryLabel: string;
  companyId: string;
  companyName: string;
  status: string;
  latestMessagePreview: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
}

export interface EmployeeChatPayload {
  threads: EmployeeChatThread[];
  selectedResponseId: string | null;
  messages: ChatMessageView[];
}

export interface EmployerChatApplicant {
  responseId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  resumeTitle: string;
  status: string;
  latestMessagePreview: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
}

export interface EmployerChatVacancy {
  vacancyId: string;
  title: string;
  salaryLabel: string;
  applicantsCount: number;
  unreadCount: number;
}

export interface EmployerChatPayload {
  vacancies: EmployerChatVacancy[];
  applicants: EmployerChatApplicant[];
  selectedVacancyId: string | null;
  selectedResponseId: string | null;
  messages: ChatMessageView[];
}

export interface ChatNotification {
  responseId: string;
  vacancyId: string;
  vacancyTitle: string;
  counterpartyName: string;
  unreadCount: number;
  latestMessagePreview: string;
  latestMessageAt: string;
  dashboardHref: string;
}
