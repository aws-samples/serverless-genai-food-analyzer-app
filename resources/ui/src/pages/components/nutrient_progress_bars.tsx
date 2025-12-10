import { Box, ProgressBar, SpaceBetween } from '@cloudscape-design/components';

interface NutrientProgressBarsProps {
  calories?: number;
  salt?: number;
  sugars?: number;
  proteins?: number;
}

const DAILY_VALUES = {
  calories: 2000,
  salt: 6,
  sugars: 50,
  proteins: 50,
};

export const NutrientProgressBars: React.FC<NutrientProgressBarsProps> = ({
  calories,
  salt,
  sugars,
  proteins,
}) => {
  return (
    <SpaceBetween size="s">
      {calories !== undefined && (
        <Box>
          <ProgressBar
            value={(calories / DAILY_VALUES.calories) * 100}
            additionalInfo={`${calories} kcal / 100g`}
            description="Calories"
          />
        </Box>
      )}
      {salt !== undefined && (
        <Box>
          <ProgressBar
            value={(salt / DAILY_VALUES.salt) * 100}
            additionalInfo={`${salt}g / 100g`}
            description="Salt"
          />
        </Box>
      )}
      {sugars !== undefined && (
        <Box>
          <ProgressBar
            value={(sugars / DAILY_VALUES.sugars) * 100}
            additionalInfo={`${sugars}g / 100g`}
            description="Sugar"
          />
        </Box>
      )}
      {proteins !== undefined && (
        <Box>
          <ProgressBar
            value={(proteins / DAILY_VALUES.proteins) * 100}
            additionalInfo={`${proteins}g / 100g`}
            description="Protein"
          />
        </Box>
      )}
    </SpaceBetween>
  );
};
