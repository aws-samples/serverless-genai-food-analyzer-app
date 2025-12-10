interface NutriScoreLogoProps {
  grade: string;
  size?: number;
}

export const NutriScoreLogo: React.FC<NutriScoreLogoProps> = ({ grade, size = 200 }) => {
  const g = grade.toLowerCase();
  
  return (
    <svg width={size} height={size * 0.4} viewBox="0 0 264 105" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="264" height="105" rx="8" fill="#f0f0f0"/>
      
      {/* NUTRI-SCORE text */}
      <text x="132" y="25" fontSize="14" fontWeight="bold" fill="#999" textAnchor="middle" fontFamily="Arial">
        NUTRI-SCORE
      </text>
      
      {/* A - Dark Green */}
      <g opacity={g === 'a' ? 1 : 0.3}>
        <circle cx="35" cy="65" r="22" fill="#038141"/>
        <text x="35" y="73" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">A</text>
      </g>
      
      {/* B - Light Green */}
      <g opacity={g === 'b' ? 1 : 0.3}>
        <circle cx="82" cy="65" r="22" fill="#85bb2f"/>
        <text x="82" y="73" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">B</text>
      </g>
      
      {/* C - Yellow */}
      <g opacity={g === 'c' ? 1 : 0.3}>
        <circle cx="132" cy="65" r="22" fill="#fecb02"/>
        <text x="132" y="73" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">C</text>
      </g>
      
      {/* D - Orange */}
      <g opacity={g === 'd' ? 1 : 0.3}>
        <circle cx="182" cy="65" r="22" fill="#ee8100"/>
        <text x="182" y="73" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">D</text>
      </g>
      
      {/* E - Red */}
      <g opacity={g === 'e' ? 1 : 0.3}>
        <circle cx="229" cy="65" r="22" fill="#e63e11"/>
        <text x="229" y="73" fontSize="28" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">E</text>
      </g>
    </svg>
  );
};
