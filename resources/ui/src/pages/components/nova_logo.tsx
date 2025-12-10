interface NovaLogoProps {
  group: number;
  size?: number;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({ group, size = 120 }) => {
  const colors = ['#00b140', '#85bb2f', '#fecb02', '#ee8100'];
  const color = colors[group - 1] || '#999';
  
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 160 240" xmlns="http://www.w3.org/2000/svg">
      {/* NOVA text */}
      <text x="80" y="40" fontSize="36" fontWeight="bold" fill="#808080" textAnchor="middle" fontFamily="Arial">
        NOVA
      </text>
      
      {/* Colored rectangle with number */}
      <rect x="0" y="60" width="160" height="180" fill={color}/>
      
      {/* Large number */}
      <text x="80" y="180" fontSize="120" fontWeight="bold" fill="white" textAnchor="middle" fontFamily="Arial">
        {group}
      </text>
    </svg>
  );
};
