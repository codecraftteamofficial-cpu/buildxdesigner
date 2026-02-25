const ONBOARDING_PENDING_PREFIX = "buildxdesigner:onboarding-pending:";
const ONBOARDING_COMPLETED_PREFIX = "buildxdesigner:onboarding-completed:";
const ONBOARDING_RESPONSES_PREFIX = "buildxdesigner:onboarding-responses:";

const getPendingKey = (userId: string) => `${ONBOARDING_PENDING_PREFIX}${userId}`;
const getCompletedKey = (userId: string) => `${ONBOARDING_COMPLETED_PREFIX}${userId}`;
const getResponsesKey = (userId: string) => `${ONBOARDING_RESPONSES_PREFIX}${userId}`;

export interface OnboardingAnswers {
  primaryRole: string;
  workplaceType: string;
  teamSize: string;
  mainGoal: string;
  experienceLevel: string;
}

export function markOnboardingRequired(userId: string) {
  localStorage.setItem(getPendingKey(userId), "true");
}

export function clearOnboardingRequired(userId: string) {
  localStorage.removeItem(getPendingKey(userId));
}

export function isOnboardingCompleted(userId: string) {
  return localStorage.getItem(getCompletedKey(userId)) === "true";
}

export function isOnboardingRequired(userId: string) {
  return (
    localStorage.getItem(getPendingKey(userId)) === "true" &&
    !isOnboardingCompleted(userId)
  );
}

export function completeOnboarding(userId: string, answers: OnboardingAnswers) {
  localStorage.setItem(getCompletedKey(userId), "true");
  localStorage.removeItem(getPendingKey(userId));
  localStorage.setItem(getResponsesKey(userId), JSON.stringify(answers));
}