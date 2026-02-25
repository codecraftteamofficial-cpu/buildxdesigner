import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../supabase/config/supabaseClient';
import { getSupabaseSession } from '../supabase/auth/authService';

interface OnboardingQuestionnaireProps {
  onComplete: () => void;
}

interface OnboardingData {
  primaryRole: string;
  workplaceType: string;
  experience: string;
  mainGoal: string;
  teamSize: string;
}

const questions = [
  {
    id: 'primaryRole',
    title: 'What is your primary role?',
    subtitle: 'Help us understand your background',
    options: [
      { value: 'designer', label: 'Designer', icon: '🎨' },
      { value: 'developer', label: 'Developer', icon: '💻' },
      { value: 'entrepreneur', label: 'Entrepreneur', icon: '🚀' },
      { value: 'marketer', label: 'Marketer', icon: '📊' },
      { value: 'student', label: 'Student', icon: '🎓' },
      { value: 'other', label: 'Other', icon: '✨' },
    ],
  },
  {
    id: 'workplaceType',
    title: 'What best describes your workplace?',
    subtitle: 'Select the environment you work in',
    options: [
      { value: 'freelancer', label: 'Freelancer', icon: '🏠' },
      { value: 'startup', label: 'Startup', icon: '🌱' },
      { value: 'smallBusiness', label: 'Small Business', icon: '🏪' },
      { value: 'enterprise', label: 'Enterprise', icon: '🏢' },
      { value: 'agency', label: 'Agency', icon: '🤝' },
      { value: 'other', label: 'Other', icon: '✨' },
    ],
  },
  {
    id: 'experience',
    title: 'What is your experience level?',
    subtitle: 'Tell us about your web design experience',
    options: [
      { value: 'beginner', label: 'Beginner', icon: '🌱' },
      { value: 'intermediate', label: 'Intermediate', icon: '📈' },
      { value: 'advanced', label: 'Advanced', icon: '⭐' },
      { value: 'expert', label: 'Expert', icon: '🏆' },
    ],
  },
  {
    id: 'mainGoal',
    title: 'What is your main goal?',
    subtitle: 'What would you like to achieve with BuildX Designer?',
    options: [
      { value: 'portfolio', label: 'Build a Portfolio', icon: '📁' },
      { value: 'business', label: 'Create Business Website', icon: '💼' },
      { value: 'blog', label: 'Start a Blog', icon: '📝' },
      { value: 'ecommerce', label: 'E-commerce Store', icon: '🛍️' },
      { value: 'learning', label: 'Learn Web Design', icon: '📚' },
      { value: 'other', label: 'Other', icon: '✨' },
    ],
  },
  {
    id: 'teamSize',
    title: 'What is your team size?',
    subtitle: 'How many people work with you?',
    options: [
      { value: 'solo', label: 'Just Me', icon: '👤' },
      { value: 'small', label: '2-5 People', icon: '👥' },
      { value: 'medium', label: '6-20 People', icon: '👨‍💼' },
      { value: 'large', label: '20+ People', icon: '🏢' },
    ],
  },
];

export const OnboardingPage: React.FC<OnboardingQuestionnaireProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingData>({
    primaryRole: '',
    workplaceType: '',
    experience: '',
    mainGoal: '',
    teamSize: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelectOption = (value: string) => {
    const questionId = currentQuestion.id as keyof OnboardingData;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await getSupabaseSession();

      if (!session?.user) {
        console.error('No authenticated user found');
        setIsSubmitting(false);
        return;
      }

      // Update user metadata with onboarding data
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          primary_role: answers.primaryRole,
          workplace_type: answers.workplaceType,
          experience_level: answers.experience,
          main_goal: answers.mainGoal,
          team_size: answers.teamSize,
        },
      });

      // Also save to profiles table if it exists
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          primary_role: answers.primaryRole,
          workplace_type: answers.workplaceType,
          experience_level: answers.experience,
          main_goal: answers.mainGoal,
          team_size: answers.teamSize,
        })
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error saving onboarding data to profiles:', error);
      }

      // Show completion animation
      setShowCompletion(true);

      // Call onComplete after animation
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      setIsSubmitting(false);
    }
  };

  const isAnswered = answers[currentQuestion.id as keyof OnboardingData] !== '';
  const isLastQuestion = currentStep === questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>

      <AnimatePresence mode="wait">
        {showCompletion ? (
          <motion.div
            key="completion"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="text-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              All Set!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-blue-200 mb-8"
            >
              We've customized your experience. Let's get started!
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="questions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl relative z-10"
          >
            <Card className="shadow-2xl border-0 bg-slate-800/80 backdrop-blur-xl">
              <CardHeader className="pb-4">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-200">
                        Getting to know you
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-300">
                      {currentStep + 1} of {questions.length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Question Title */}
                <motion.div
                  key={`question-${currentStep}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardTitle className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {currentQuestion.title}
                  </CardTitle>
                  <p className="text-blue-200">{currentQuestion.subtitle}</p>
                </motion.div>
              </CardHeader>

              <CardContent className="pb-8">
                {/* Options Grid */}
                <motion.div
                  key={`options-${currentStep}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                >
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectOption(option.value)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left group ${
                        answers[currentQuestion.id as keyof OnboardingData] ===
                        option.value
                          ? 'border-blue-400 bg-blue-500/20'
                          : 'border-slate-600 bg-slate-700/50 hover:border-blue-400 hover:bg-slate-700/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                          {option.label}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="gap-2 border-slate-600 text-blue-300 hover:bg-slate-700 hover:text-blue-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={!isAnswered || isSubmitting}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLastQuestion ? (
                      <>
                        {isSubmitting ? 'Completing...' : 'Complete'}
                        <Check className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Decorative Elements */}
            <div className="mt-8 text-center text-sm text-blue-300">
              <p>We use this information to customize your experience</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
