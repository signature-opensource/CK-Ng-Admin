/**
 * Builds a strong random password, guaranteed to satisfy `passwordComplexityValidator` (it always
 * carries at least one uppercase, one lowercase, one digit and one special character).
 *
 * Ambiguous characters (0/O, 1/l/I) are excluded so the value stays easy to read and to dictate: an
 * administrator provisioning a new user, or forcing the reset of a password, has to hand the value
 * over to that user.
 */
export function generateStrongPassword( length = 16 ): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*-_=+?';
  const all = upper + lower + digits + special;
  const pick = ( set: string ): string => set[randomInt( set.length )];
  const chars = [pick( upper ), pick( lower ), pick( digits ), pick( special )];
  while ( chars.length < length ) chars.push( pick( all ) );
  // Fisher-Yates shuffle so the guaranteed characters are not always in front.
  for ( let i = chars.length - 1; i > 0; i-- ) {
    const j = randomInt( i + 1 );
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join( '' );
}

function randomInt( max: number ): number {
  const arr = new Uint32Array( 1 );
  crypto.getRandomValues( arr );
  return arr[0] % max;
}
