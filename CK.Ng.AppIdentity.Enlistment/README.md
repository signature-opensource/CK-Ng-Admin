# CK.Ng.AppIdentity.Enlistment

The approval page of a CK-AppIdentity System. A party that a holder doesn't trust yet waits for an approval: its
holder hands it the URL of the approval page of the System, followed by `?party={its full name}`; the page asks the
pending approvals of the System through the Authentication Center, the hub of the System (see
[CK.AppIdentity.TransportLayer](https://github.com/signature-opensource/CK-AppIdentity-Transport/blob/stable/CK.AppIdentity.TransportLayer/README.md#the-approval-page-and-the-enlistment-url)).
An operator opens the URL, reads the approval code on the waiting party and enters it on the page.

## The package

[`NgAppIdentityEnlistmentPackage`](NgAppIdentityEnlistmentPackage.cs) has the "Enlistment" fact
(`[PartyClientFact( "Enlistment", "app-identity/enlist" )]`, the path of the page): a client application built with it
is the approval page: its party states the fact in its description, the Authentication Center reads it and states the
URL of the page (the URL of the client application followed by the value of the fact) to the System.
It registers the `IApprovePartyCommand`, the `IGetPendingApprovalsQCommand`, the `IGetPartyInstancesQCommand`, the
`IRemovePartyInstanceCommand` and the enlistment ticket commands (`IOpenEnlistmentTicketCommand`,
`IGetEnlistmentTicketsQCommand`, `IRevokeEnlistmentTicketCommand`) of
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
  party from a listener it doesn't trust yet). A new dynamic instance of an Opened template (`IPendingApproval.TemplatePartyName`)
  says it ("A new instance of $Worker-{Name}");
- without `?party=`, also lists the approved dynamic instances of the Opened templates (`IGetPartyInstancesQCommand`),
  each one with a "Remove" button that sends the `IRemovePartyInstanceCommand` (Critical: when the window is over, the
  click signs in again first): its holders forget its identity, it becomes a candidate again when it calls;
- without `?party=`, also has "Expect a party": the operator enters the full name of a party it expects and the lifetime
  of its ticket (24 hours by default, 168 at most) and opens a pre-authorized enlistment ticket
  (`IOpenEnlistmentTicketCommand`, Critical). The ticket is shown once, to copy: it is a secret given to the party at
  start ("Local:KeyManagement:EnlistTicket"), the party is then trusted by the Authentication Center without a code
  (and, while the ticket is open, a key presented under this name without it is refused). The tickets of the center are
  listed (`IGetEnlistmentTicketsQCommand`: open until, or used when and by which key), each one with a "Revoke" button
  (`IRevokeEnlistmentTicketCommand`);
- with `?party=`, shows the party, the holders it waits on (the kind, since when, the fingerprint of the key), and one
  code field per holder (a code belongs to a pair of parties; "Add a code" adds one);
- sends the `IApprovePartyCommand` (when the Critical window is over, the Approve click signs in again first, the codes
  are kept) and shows its outcome for each party that holds a pending approval of the party.

The page doesn't approve anything itself: the command is handled by the host (CK.AppIdentity.Enlistment, or any
handler of the application).
