Adds the banished-user features to the admin user management: the show-banned filter, the banned tag
next to the user name, and the ban / unban actions.

The ban modal captures a reason and a duration - presets, a custom end date, or permanent. It refuses
LIKE wildcards in the reason, because the stored procedure matches an existing banishment with LIKE.

Every user-facing label speaks of disabling rather than banning; the code and the database keep the
banned vocabulary.
