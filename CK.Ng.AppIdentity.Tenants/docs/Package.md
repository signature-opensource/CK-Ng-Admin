The tenants page of a CK-AppIdentity System, at `/app-identity/tenants`: an operator at the Critical level sees the
applications that hold Opened tenant templates (the hosts of the "Tenants" route), their templates and their tenants
(configured, run-time, unloaded with their reason), creates a tenant (a name: its index is the first free one), moves a
run-time tenant to a free index and removes one (its keys are deleted). The handlers are in CK.AppIdentity.Tenants.
