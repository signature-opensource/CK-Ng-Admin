using CK.Core;
using CK.TS.Angular;

namespace CK.Ng.AppIdentity.Enlistment;

/// <summary>
/// The approval page, at "/app-identity/enlist?party={full name}" of its client application (the target of the
/// "Enlistment" route): an operator at the Critical level enters the codes read on the party to approve, and the page
/// shows the outcome of the approval on each party that holds a pending approval of it.
/// </summary>
[NgRoutedComponent<AppComponent>( Route = "app-identity/enlist", RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<NgAppIdentityEnlistmentPackage>]
public sealed class EnlistPageComponent : NgRoutedComponent
{
}
