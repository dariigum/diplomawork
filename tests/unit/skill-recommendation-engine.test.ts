import { describe, expect, it } from 'vitest'
import { generateSkillImprovementReport } from '@/lib/skill-recommendation-engine'

describe('skill-recommendation-engine', () => {
  it('builds profile, recommendations, and direction opportunities from user signals', async () => {
    const report = await generateSkillImprovementReport({
      resumeText: [
        'Frontend developer',
        'Skills: HTML, CSS, JavaScript, React',
        'Built responsive interfaces and reusable components',
      ].join('\n'),
      savedVacancies: [
        {
          _id: 'v-saved-1',
          title: 'Backend Developer (Node.js)',
          description: 'Build APIs with Node.js and Express. Work with PostgreSQL and Docker.',
          skillsRequired: 'Node.js, Express, PostgreSQL, Docker',
        },
        {
          _id: 'v-saved-2',
          title: 'Fullstack Engineer',
          description: 'React frontend and Node.js backend, CI/CD pipeline.',
          skillsRequired: 'React, TypeScript, Node.js, Docker',
        },
      ],
      appliedVacancies: [
        {
          _id: 'v-applied-1',
          title: 'Frontend Developer',
          description: 'React + TypeScript, API integrations, testing.',
          skillsRequired: 'React, TypeScript, Jest',
        },
      ],
      marketVacancies: [
        {
          _id: 'v-market-1',
          title: 'Junior DevOps Engineer',
          description: 'Docker, Kubernetes, cloud fundamentals.',
          skillsRequired: 'Docker, Kubernetes, AWS',
        },
      ],
    })

    expect(report.currentSkills.total).toBeGreaterThan(0)
    expect(report.sourceStats.savedVacancies).toBe(2)
    expect(report.sourceStats.appliedVacancies).toBe(1)
    expect(report.currentProfile.suitableDirections.some((d) => d.path === 'frontend')).toBe(true)

    expect(
      report.topRecommendations.some((rec) =>
        ['nodejs', 'typescript', 'docker', 'postgresql'].includes(rec.skill),
      ),
    ).toBe(true)

    const backendDirection = report.careerDirections.find((d) => d.path === 'backend')
    expect(backendDirection).toBeDefined()
    expect((backendDirection?.skillsToLearn.length ?? 0) > 0).toBe(true)

    expect(report.nextSteps.length).toBeGreaterThan(0)
  })

  it('returns explicit onboarding steps when resume is missing', async () => {
    const report = await generateSkillImprovementReport({
      resumeText: '',
      savedVacancies: [],
      appliedVacancies: [],
      marketVacancies: [],
    })

    expect(report.currentSkills.total).toBe(0)
    expect(report.topRecommendations).toEqual([])
    expect(report.nextSteps).toContain('resume_required')
    expect(report.nextSteps).toContain('add_resume_skills')
  })
})
