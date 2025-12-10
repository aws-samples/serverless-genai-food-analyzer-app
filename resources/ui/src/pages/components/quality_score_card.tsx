import { Box, SpaceBetween } from '@cloudscape-design/components';

interface QualityScoreCardProps {
  nutriscore_grade?: string;
  additives?: any[];
  labels_tags?: string[];
}

const calculateYukaScore = (nutri?: string, additives?: any[], labels?: string[]): number => {
  let score = 0;

  // 60% - Nutritional quality (Nutri-Score)
  if (nutri) {
    const nutriScores: Record<string, number> = { 
      a: 100, 
      b: 75, 
      c: 50, 
      d: 25, 
      e: 0 
    };
    score += (nutriScores[nutri.toLowerCase()] || 50) * 0.6;
  }

  // 30% - Additives (simplified: assume no high-risk additives for now)
  const additiveCount = additives?.length || 0;
  let additiveScore = 100;
  if (additiveCount > 0) {
    additiveScore = Math.max(0, 100 - (additiveCount * 10));
  }
  score += additiveScore * 0.3;

  // 10% - Organic bonus
  const isOrganic = labels?.some(label => 
    label.includes('organic') || 
    label.includes('bio') || 
    label.includes('eu-organic')
  ) || false;
  score += isOrganic ? 10 : 0;

  return Math.round(score);
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return '#037f0c';
  if (score >= 50) return '#ff8c00';
  if (score >= 25) return '#d91515';
  return '#8b0000';
};

const getScoreLabel = (score: number): string => {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Poor';
  return 'Bad';
};

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ 
  nutriscore_grade, 
  additives,
  labels_tags 
}) => {
  const score = calculateYukaScore(nutriscore_grade, additives, labels_tags);
  
  if (!nutriscore_grade) return null;

  const color = getScoreColor(score);

  return (
    <div style={{ 
      padding: '12px', 
      backgroundColor: color + '15', 
      borderRadius: '8px', 
      textAlign: 'center' 
    }}>
      <SpaceBetween size="xs">
        <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>
          {score}/100
        </div>
        <Box fontSize="body-s" color="text-body-secondary">
          {getScoreLabel(score)}
        </Box>
      </SpaceBetween>
    </div>
  );
};
