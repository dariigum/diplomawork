'use client';

import * as React from 'react';

export type EmployerDashboardTab = 'profile' | 'candidates' | 'chat';

export type PendingApplicant = {
  applicationId: string;
  chatId: string | null;
  employee: { id: string; name: string; image?: string | null };
  resume: {
    id: string;
    title: string;
    skillsPreview: string;
    cvFile?: string;
    cvLink?: string;
  } | null;
  status: string;
  appliedAt: string;
  unreadCount: number;
  match?: { semanticScore: number; matchScore: number; fitLevel: 'Strong Fit' | 'Related' | 'Exploratory' } | null;
  overlapSkills?: string[];
};

type EmployerDashboardNavContextValue = {
  vacancyId: string | null;
  setVacancyId: (id: string | null) => void;
  activeTab: EmployerDashboardTab;
  goToTab: (tab: EmployerDashboardTab, vacancyId?: string | null) => void;
  pendingApplicant: PendingApplicant | null;
  setPendingApplicant: (a: PendingApplicant | null) => void;
};

const EmployerDashboardNavContext = React.createContext<EmployerDashboardNavContextValue | null>(null);

export function EmployerDashboardNavProvider({
  value,
  children,
}: {
  value: EmployerDashboardNavContextValue;
  children: React.ReactNode;
}) {
  return (
    <EmployerDashboardNavContext.Provider value={value}>{children}</EmployerDashboardNavContext.Provider>
  );
}

export function useEmployerDashboardNav(): EmployerDashboardNavContextValue {
  const ctx = React.useContext(EmployerDashboardNavContext);
  if (!ctx) {
    throw new Error('useEmployerDashboardNav must be used within EmployerDashboardNavProvider');
  }
  return ctx;
}
