Angular CKomposable package that brings the `/admin` page: the administration shell that the actual
administration features hang off.

It also adds the `isAdmin` signal to the user service. That signal is not a role but a grant level
threshold: platform administrator (`IsPlatformAdmin` of the profile, the server rule), or administrator of the current
workspace - so it changes when the user switches workspace, with no round trip.
