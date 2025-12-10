interface EcoScoreLogoProps {
  grade: string;
  size?: number;
}

export const EcoScoreLogo: React.FC<EcoScoreLogoProps> = ({ grade, size = 80 }) => {
  const g = grade.toUpperCase();
  
  // Handle unknown grades
  if (g === 'UNKNOWN' || !g) {
    return (
      <div 
        style={{ 
          height: `${size}px`, 
          width: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          border: '2px solid #ccc',
          borderRadius: '8px',
          fontSize: `${size * 0.2}px`,
          fontWeight: 'bold',
          color: '#666'
        }}
      >
        N/A
      </div>
    );
  }
  
  const svgPath = `/icon/Green-score ${g}.svg`;
  
  return (
    <img 
      src={svgPath} 
      alt={`Eco-Score ${g}`}
      style={{ height: `${size}px`, width: 'auto' }}
    />
  );
};
