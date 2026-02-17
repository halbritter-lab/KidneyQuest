export function checkCollision(a, b, shrink = 0) {
  return (
    a.x + shrink < b.x + b.width - shrink &&
    a.x + a.width - shrink > b.x + shrink &&
    a.y + shrink < b.y + b.height - shrink &&
    a.y + a.height - shrink > b.y + shrink
  );
}
