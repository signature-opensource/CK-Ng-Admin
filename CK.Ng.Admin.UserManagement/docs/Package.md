Angular CKomposable package that brings the `/admin/user` page: workspace user listing, direct
creation, edit, and forced password reset.

A user created here starts with a generated strong password and is forced through the temporary
password flow at first login. Invitations and banished users are brought by separate packages that
inject into these components rather than replace them.
