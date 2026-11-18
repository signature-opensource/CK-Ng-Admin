# CK.Ng.AppIdentity.Tenants

The tenants page of a CK-AppIdentity System, at `/app-identity/tenants` of the client application built with this
package ([`TenantsPageComponent`](TenantsPage/TenantsPageComponent.cs)). It manages the run-time tenant domains of the
applications of the System: the instances of their Opened tenant templates (see CK.AppIdentity.Tenants).

- **The applications:** the hosts of the "Tenants" route that reach the party of the client application
  (`IGetTenantHostsQCommand`): an application that holds Opened tenant templates hosts it. Each one is asked for its
  templates and tenants (`IGetTenantInstancesQCommand`): the configured ones, the run-time ones (with their index) and
  the unloaded ones (with their reason: their index is taken by a configured instance, or above a lowered bound...).
- **The operations:** a tenant is created by its name (`ICreateTenantInstanceCommand`: its index is the first free one),
  a run-time tenant is moved to a free index (`ISetTenantIndexCommand`: an unloaded one is loaded again), or removed
  after a confirmation (`IRemoveTenantInstanceCommand`: its keys are deleted, a new tenant of the same name is a new
  identity). The commands are party commands: they reach an application that is not a remote along the "Tenants" route.

Like the approval page, it requires the Critical level: the operator signs in again in a popup, the page keeps what was
entered.
