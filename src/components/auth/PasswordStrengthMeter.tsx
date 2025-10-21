import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface PasswordStrength {
  score: number;
  feedback: string;
  color: string;
  isValid: boolean;
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, feedback: 'Enter a password', color: 'text-muted-foreground', isValid: false };
  }

  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[^A-Za-z0-9]/.test(password),
  };

  // Calculate score based on criteria met
  if (checks.length) score += 20;
  if (checks.lowercase) score += 20;
  if (checks.uppercase) score += 20;
  if (checks.numbers) score += 20;
  if (checks.symbols) score += 20;

  // Determine feedback and validation
  if (score < 40) {
    return { 
      score, 
      feedback: 'Weak', 
      color: 'text-destructive', 
      isValid: false 
    };
  } else if (score < 60) {
    return { 
      score, 
      feedback: 'Fair', 
      color: 'text-yellow-600', 
      isValid: false 
    };
  } else if (score < 80) {
    return { 
      score, 
      feedback: 'Good', 
      color: 'text-orange-600', 
      isValid: true 
    };
  } else {
    return { 
      score, 
      feedback: 'Strong', 
      color: 'text-green-600', 
      isValid: true 
    };
  }
};

interface PasswordStrengthMeterProps {
  password: string;
  showDetails?: boolean;
}

export const PasswordStrengthMeter = ({ password, showDetails = true }: PasswordStrengthMeterProps) => {
  const strength = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password strength</span>
        <span className={cn("text-sm font-medium", strength.color)}>
          {strength.feedback}
        </span>
      </div>
      <Progress 
        value={strength.score} 
        className={cn(
          "h-2",
          strength.score < 40 && "[&>div]:bg-destructive",
          strength.score >= 40 && strength.score < 60 && "[&>div]:bg-yellow-500",
          strength.score >= 60 && strength.score < 80 && "[&>div]:bg-orange-500",
          strength.score >= 80 && "[&>div]:bg-green-500"
        )}
      />
      {showDetails && (
        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          <div className={cn(password.length >= 8 ? "text-green-600" : "")}>
            ✓ 8+ characters
          </div>
          <div className={cn(/[A-Z]/.test(password) ? "text-green-600" : "")}>
            ✓ Uppercase letter
          </div>
          <div className={cn(/[a-z]/.test(password) ? "text-green-600" : "")}>
            ✓ Lowercase letter
          </div>
          <div className={cn(/\d/.test(password) ? "text-green-600" : "")}>
            ✓ Number
          </div>
        </div>
      )}
    </div>
  );
};