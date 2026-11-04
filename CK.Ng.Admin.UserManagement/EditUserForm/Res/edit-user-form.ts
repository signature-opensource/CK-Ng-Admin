import { Component, OnInit, TemplateRef, inject, viewChild } from '@angular/core';
import { FormField, required, validate } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { CustomFieldContext, customField, generateStrongPassword, GenericFields, GenericForm, genericForm, GenericFormHandle, GetWorkspaceUserEditDataQCommand, GroupInfos, HttpCrisEndpoint, passwordComplexity, PasswordStrength, UserWorkspaceGroupPicker, WorkspaceUser } from '@local/ck-gen';

type EditUserFormValue = { firstName: string, lastName: string, userName: string, email: string, cultureName: string, groups: Array<number>, password?: string };

@Component({
    selector: 'ck-edit-user-form',
    templateUrl: './edit-user-form.html',
    styleUrls: ['./edit-user-form.less'],
    imports: [FormField, NzInputModule, NzButtonModule, FontAwesomeModule, TranslatePipe, UserWorkspaceGroupPicker, GenericForm, PasswordStrength]
})
export class EditUserForm implements OnInit {
    // <PreViewChildren revert />
    protected readonly groupsTemplate = viewChild<TemplateRef<CustomFieldContext<number[]>>>('groupsTemplate');
    protected readonly passwordTemplate = viewChild<TemplateRef<CustomFieldContext<string>>>('passwordTemplate');
    // <PostViewChildren />

    // <PreDependencyInjection revert />
    readonly #crisEndpoint = inject(HttpCrisEndpoint);
    readonly #nzModalData = inject(NZ_MODAL_DATA);
    // <PostDependencyInjection />

    // <PreInputOutput revert />
    // <PostInputOutput />

    // <PreIconsDefinition revert />
    protected readonly refreshIcon = faRotate;
    // <PostIconsDefinition />

    // <PreLocalVariables revert />
    public workspaceGroups: Array<GroupInfos> = [];
    public user: WorkspaceUser;
    public workspace: GroupInfos;
    // Basic user creation (userId === 0) provisions an initial sign-in password; the edit flow does not.
    public readonly isCreate: boolean;
    /**
     * The scalar fields given by the opener in `NZ_MODAL_DATA.fields`, then `groups` and, on create, `password`.
     * Its fields are fixed when the component is created.
     */
    public readonly userForm: GenericFormHandle<GenericFields>;
    // <PostLocalVariables />

    constructor() {
        this.user = this.#nzModalData.user;
        this.workspace = this.#nzModalData.workspace;
        this.isCreate = this.user.userId === 0;
        const scalarFields: GenericFields = this.#nzModalData.fields;
        // On create, the admin sets an initial basic-authentication password (pre-filled with a strong
        // random value, regenerable from the input) so the new user can sign in right away.
        const initialPassword = this.isCreate ? generateStrongPassword() : '';
        // <PreCustomFormDefinition revert />
        this.userForm = genericForm<GenericFields>(() => ({
            ...scalarFields,
            // <PreGroupsFormControlDefinition revert />
            groups: customField<number[]>('CK.Admin.UserManagement.Form.Groups', [], {
                template: this.groupsTemplate()!,
                rules: p => {
                    // required() gives the label its mark but sees no error in an empty array.
                    required(p);
                    validate(p, ({ value }) => value().length ? undefined : { kind: 'required', message: 'CK.Admin.UserManagement.Form.GroupsRequired' });
                }
            }),
            // <PostGroupsFormControlDefinition />
            ...(this.isCreate ? {
                password: customField<string>('CK.Admin.UserManagement.User.Password', initialPassword, {
                    template: this.passwordTemplate()!,
                    rules: p => {
                        required(p, { message: 'CK.Admin.UserManagement.User.PasswordRequired' });
                        // No message: ck-password-strength under the input lists the unmet criteria.
                        passwordComplexity(p);
                    }
                })
            } : {})
        }));
        // <PostCustomFormDefinition />
    }

    get valid(): boolean {
        return this.userForm.form().valid();
    }

    getValue(): EditUserFormValue {
        return { ...this.userForm.model() } as EditUserFormValue;
    }

    // Regenerates the create-flow password into the input (bound to the refresh button).
    regeneratePassword(): void {
        if (this.isCreate) {
            this.userForm.model.update(m => ({ ...m, password: generateStrongPassword() }));
        }
    }

    async ngOnInit(): Promise<void> {
        await this.getEditUserData();
    }

    async getEditUserData(): Promise<void> {
        // <PreGetEditUserData revert />
        const res = await this.#crisEndpoint.sendOrThrowAsync(new GetWorkspaceUserEditDataQCommand(this.user.userId));
        if (res) {
            const groups = [...res.workspaceGroups];
            const userGroups = [...res.userGroups];
            groups.forEach(g => {
                if (g.groupName.includes('Administrators')) {
                    let zoneGroup = { groupId: g.zoneId, groupName: g.zoneName, isZone: false, zoneId: g.zoneId, zoneName: g.zoneName } as GroupInfos;
                    if (!groups.find(group => group.groupId === g.zoneId)) {
                        groups.unshift(zoneGroup);
                    }
                    if (!userGroups.find(group => group.groupId === g.zoneId)) {
                        userGroups.unshift(zoneGroup);
                    }
                }
            });
            this.userForm.model.update(m => ({ ...m, groups: userGroups.map(g => g.groupId) }));
            this.workspaceGroups = [...groups];
        }
        // <PostGetEditUserData />
    }
}
