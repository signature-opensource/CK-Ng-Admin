create <ts> transformer
begin
    ensure import { computed } from '@angular/core';
    ensure import { GrantLevel, GroupInfos } from '@local/ck-gen';

    inject """
           readonly isAdmin: Signal<boolean> = computed( () => {
             let result = false;
             // <PrePlatformAdmin />
             // The server rule (CK.fIsUserPlatformAdmin), given by the profile: no group name nor level is guessed here.
             if( this.userProfile()?.isPlatformAdmin ) {
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
