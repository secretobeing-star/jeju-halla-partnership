export function getBoardCommunityGridClass({
  compact,
  viewsEnabled,
  reactionsEnabled,
}: {
  compact: boolean;
  viewsEnabled: boolean;
  reactionsEnabled: boolean;
}) {
  const classes = ["board-community-grid"];

  if (compact) {
    classes.push("board-community-grid--compact");
    if (!viewsEnabled) classes.push("board-community-grid--compact-no-views");
    if (!reactionsEnabled) classes.push("board-community-grid--compact-no-rec");
  } else {
    classes.push("board-community-grid--desktop");
    if (!viewsEnabled) classes.push("board-community-grid--desktop-no-views");
    if (!reactionsEnabled) classes.push("board-community-grid--desktop-no-rec");
  }

  return classes.join(" ");
}
