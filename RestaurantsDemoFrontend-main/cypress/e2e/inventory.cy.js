describe('Inventory Management', () => {
    beforeEach(() => {
        // Authenticate before checking inventory
        cy.visit('http://localhost:3000');
        cy.get('#email').type('admin');
        cy.get('#password').type('123456');
        cy.get('button.submit').click();
        
        // Wait for redirect
        cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
    });

    it('should navigate to Warehouse List', () => {
        cy.visit('http://localhost:3000/viewWarehouse');
        cy.url().should('include', '/viewWarehouse');
    });

    it('should open the Create Warehouse page', () => {
        cy.visit('http://localhost:3000/createWarehouse');
        cy.url().should('include', '/createWarehouse');
    });

    it('should view Stock Reports', () => {
        cy.visit('http://localhost:3000/viewStokeRep');
        cy.url().should('include', '/viewStokeRep');
    });
});
