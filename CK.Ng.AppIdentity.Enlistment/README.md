# CK.Ng.AppIdentity.Enlistment

The approval page of a CK-AppIdentity System. A party that a holder doesn't trust yet waits for an approval: its
holder hands it the URL of the approval page of the System, followed by `?party={its full name}`, and the pending
approval travels the "Enlistment" route up to the party that hosts the page (see the routes of
[CK.AppIdentity.TransportLayer](https://github.com/signature-opensource/CK-AppIdentity-Transport/blob/stable/CK.AppIdentity.TransportLayer/README.md#the-routes-and-the-enlistment-url)).
An operator opens the URL, reads the approval code on the waiting party and enters it on the page.

## The package

[`NgAppIdentityEnlistmentPackage`](NgAppIdentityEnlistmentPackage.cs) has the "Enlistment" fact
(`[PartyClientFact( "Enlistment" )]`): a client application built with it is the approval page, so its party hosts the
"Enlistment" route of the System, whose target is the URL of the client application followed by `/app-identity/enlist`.
It registers the `IApprovePartyCommand` and the `IGetPendingApprovalsQCommand` of
[CK.IO.AppIdentity.Enlistment](https://github.com/signature-opensource/CK-AppIdentity-Transport/blob/stable/CK.IO.AppIdentity.Enlistment/README.md).

## The page

[`EnlistPageComponent`](EnlistPage/EnlistPageComponent.cs) is the public route `app-identity/enlist` of the application
(the operator often arrives without being signed in). The page ([`EnlistPage`](EnlistPage/Res/enlist-page.ts)):

- asks the operator to sign in again (`NgAuthService.elevateToCritical`, a popup: the page keeps its state) until the
  operator is at the Critical level, then shows the seconds left in the Critical window;
- reads the pending approvals that reach it (`IGetPendingApprovalsQCommand`, Critical) once the operator is at the
  Critical level, and again after each approval or on "Refresh";
- without `?party=`, lists the parties that wait for an approval, the oldest first, each one a link to the page for it:
  the operator chooses a party here rather than following a link it received (the enlistment URL reaches the waiting
  party from a listener it doesn't trust yet);
- with `?party=`, shows the party, the holders it waits on (the kind, since when, the fingerprint of the key), and one
  code field per holder (a code belongs to a pair of parties; "Add a code" adds one);
- sends the `IApprovePartyCommand` (when the Critical window is over, the Approve click signs in again first, the codes
  are kept) and shows its outcome for each party that holds a pending approval of the party.

The page doesn't approve anything itself: the command is handled by the host (CK.AppIdentity.Enlistment, or any
handler of the application).
