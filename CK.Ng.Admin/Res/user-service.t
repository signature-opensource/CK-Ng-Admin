create <ts> transformer
begin
    ensure import { computed } from '@angular/core';
    ensure import { GrantLevel, GroupInfos } from '@local/ck-gen';

    inject """
           readonly isAdmin: Signal<boolean> = computed( () => {
             let result = false;
             // <PrePlatformAdmin />
             const adminZone = this.userProfile()?.groups.find( g => g.group.groupName === 'AdminZone' );
             if( adminZone && adminZone.grantLevel >= GrantLevel.SafeAdministrator ) {
                result = true;
                // <PostPlatformAdmin />

                return result;
             }

             // <PreWorkspaceAdmin />
             const currentWorkspaceGrantLevel = this.userProfile()?.groups.find( g => g.group.groupId === this.currentWorkspace()?.groupId )?.grantLevel ?? 0;
             result = currentWorkspaceGrantLevel >= GrantLevel.SafeAdministrator;
             // <PostWorkspaceAdmin />
             
             return result;
           } );

           """ into <PostLocalVariables>;
end
