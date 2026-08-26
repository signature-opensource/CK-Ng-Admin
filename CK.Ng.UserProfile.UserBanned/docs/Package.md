Brings the banishment flow to the client: as soon as a user is banished it is logged out and sent back
to the authentication page, where the login is already refused by the database.

Three independent paths lead there, by decreasing speed - a push on the session channel, the rejection
of the channel registration, and a navigation guard - all converging on one logout path. None of them
is a security mechanism: what makes a banishment effective is the server refusing the commands of a
banished actor.
