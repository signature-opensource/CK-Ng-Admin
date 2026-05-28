using CK.Core;
using CK.TS.Angular;

namespace CK.Ng.Admin;

[NgRoutedComponent<INgPrivatePageComponent>( Route = "admin", HasRoutes = true, RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<AdminTSPackage>]
public sealed class AdminPageComponent : NgRoutedComponent
{
}
