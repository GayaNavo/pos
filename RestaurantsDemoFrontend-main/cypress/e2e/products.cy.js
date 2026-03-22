describe('Product Management', () => {
    beforeEach(() => {
        // Log in before testing Product Management
        cy.visit('http://localhost:3000');
        cy.get('#email').type('admin');
        cy.get('#password').type('123456');
        cy.get('button.submit').click();
        
        // Wait for authentication and redirect
        cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
    });

    it('should view the product list', () => {
        cy.visit('http://localhost:3000/viewProducts');
        cy.url().should('include', '/viewProducts');
        
        // Checking if the basic table or container exists
        cy.get('body').should('be.visible');
    });

    it('should open the create product page', () => {
        cy.visit('http://localhost:3000/createProduct');
        cy.url().should('include', '/createProduct');
        
        // Often create pages have forms or specific inputs
        cy.get('form').should('exist');
    });
});
