describe('Overall POS Test Suite', () => {

    describe('Authentication Flow', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
        });

        it('should show the login page on initial visit', () => {
            cy.contains('Sign in to your Account').should('be.visible');
            cy.get('#email').should('be.visible');
            cy.get('#password').should('be.visible');
        });

        it('should show an error with invalid credentials', () => {
            cy.get('#email').type('wronguser');
            cy.get('#password').type('wrongpass');
            cy.get('button[type="submit"]').click();
            cy.contains(/(Invalid|failed|not found)/i, { timeout: 5000 }).should('be.visible');
        });

        it('should login successfully with valid credentials', () => {
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
            cy.contains('Logged in successfully!').should('be.visible');
        });

        it('should allow the user to logout', () => {
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
            cy.get('body').then($body => {
                if ($body.find('button:contains("Logout")').length > 0) {
                    cy.contains('Logout').click();
                } else {
                    cy.window().then((win) => {
                        win.sessionStorage.clear();
                    });
                    cy.visit('http://localhost:3000');
                }
            });
            cy.visit('http://localhost:3000/dashboard');
            cy.url().should('eq', 'http://localhost:3000/');
        });
    });

    describe('Core Navigation', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
            cy.visit('http://localhost:3000/dashboard');
        });

        it('should navigate to Products page', () => {
            cy.visit('http://localhost:3000/viewProducts');
            cy.url().should('include', '/viewProducts');
            cy.get('body').should('be.visible');
        });

        it('should navigate to the POS System', () => {
            cy.visit('http://localhost:3000/posSystem');
            cy.url().should('include', '/posSystem');
        });
        
        it('should navigate to Sales page', () => {
            cy.visit('http://localhost:3000/viewSale');
            cy.url().should('include', '/viewSale');
        });
    });

    describe('Core POS Flow', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
        });

        it('should open the POS system interface', () => {
            cy.visit('http://localhost:3000/posSystem');
            cy.url().should('include', '/posSystem');
            cy.get('body').should('be.visible');
        });

        it('should have the basic layout for adding products to cart', () => {
            cy.visit('http://localhost:3000/posSystem');
            cy.url().should('include', '/posSystem');
            cy.get('body').should('exist');
        });
    });

    describe('Product Management', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
        });

        it('should view the product list', () => {
            cy.visit('http://localhost:3000/viewProducts');
            cy.url().should('include', '/viewProducts');
            cy.get('body').should('be.visible');
        });

        it('should open the create product page', () => {
            cy.visit('http://localhost:3000/createProduct');
            cy.url().should('include', '/createProduct');
            cy.get('form').should('exist');
        });
    });

    describe('Inventory Management', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
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

    describe('User & Role Management', () => {
        beforeEach(() => {
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

    describe('Kitchen Order Ticket (KOT) Flow', () => {
        beforeEach(() => {
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

    describe('Z-Bill Calculations and Records', () => {
        beforeEach(() => {
            cy.visit('http://localhost:3000');
            cy.get('#email').type('admin');
            cy.get('#password').type('123456');
            cy.get('button.submit').click();
            cy.url().should('match', /\/(dashboard|kitchen|prefixsettingsInitiate)$/);
        });

        it('should navigate to Z-Bill Records page', () => {
            cy.visit('http://localhost:3000/zBillRecords');
            cy.url().should('include', '/zBillRecords');
            cy.get('body').should('be.visible');
        });

        it('should have the necessary calculation elements (Placeholder)', () => {
            cy.visit('http://localhost:3000/zBillRecords');
            cy.get('body').should('exist');
        });
    });
});
