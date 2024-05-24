export function FlowItems({
  items,
}: {
  items: { id: string; content: React.ReactNode }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.id}`}
          style={{
            margin: "0.2rem",
          }}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
