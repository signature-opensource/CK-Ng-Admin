The tenants page of a CK-AppIdentity System: an operator lists the applications that hold Opened tenant templates, and
creates, moves and removes their run-time tenants.

The page is at `/app-identity/tenants`: an operator at the Critical level sees the applications (found through the hub
of the System), their templates and their tenants (configured, run-time, unloaded with their reason), creates a tenant
(a name: its index is the first free one), moves a run-time tenant to a free index and removes one (its keys are
deleted). The handlers are in CK.AppIdentity.Tenants.

See the [README](https://github.com/signature-opensource/CK-Ng-Admin/blob/stable/CK.Ng.AppIdentity.Tenants/README.md).
