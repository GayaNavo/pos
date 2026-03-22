describe('User & Role Management', () => {
    beforeEach(() => {
        // Log in with Admin permissions
        cy.visit('http://localhost:3000');
        cy.get('#email').type('admin');
        cy.get('#password').type('123456');
        cy.get('button.submit').click();
        
        cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
    });

    it('should view the Users list', () => {
        cy.visit('http://localhost:3000/users');
        cy.url().should('include', '/users');
    });

    it('should open User Creation', () => {
        cy.visit('http://localhost:3000/createUser');
        cy.url().should('include', '/createUser');
    });

    it('should view Roles and Permissions', () => {
        cy.visit('http://localhost:3000/viewRoleAndPermissions');
        cy.url().should('include', '/viewRoleAndPermissions');
    });

    it('should open Role Creation', () => {
        cy.visit('http://localhost:3000/createRoleAndPermissions');
        cy.url().should('include', '/createRoleAndPermissions');
    });
});
