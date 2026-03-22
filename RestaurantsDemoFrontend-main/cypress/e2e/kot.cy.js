describe('Kitchen Order Ticket (KOT) Flow', () => {
    beforeEach(() => {
        // Authenticate
        cy.visit('http://localhost:3000');
        cy.get('#email').type('admin');
        cy.get('#password').type('123456');
        cy.get('button.submit').click();
        
        cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
    });

    it('should access KOT Settings', () => {
        cy.visit('http://localhost:3000/kotSettings');
        cy.url().should('include', '/kotSettings');
        cy.get('body').should('be.visible');
    });

    it('should be able to view the Kitchen display', () => {
        cy.visit('http://localhost:3000/kitchen');
        cy.url().should('include', '/kitchen');
        cy.get('body').should('be.visible');
    });
});
