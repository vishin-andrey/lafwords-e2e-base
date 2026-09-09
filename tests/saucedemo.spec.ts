import { test, expect} from '../fixtures/fixtures';

const usernameCorrect = 'standard_user';
const passwordCorrect = 'secret_sauce';

test.describe('Login Page Tests', () => {

  test.beforeEach(async ({loginPage}) => {
    await loginPage.openLoginPage();
  });

  test('Login happy path', async ({loginPage, inventoryPage}) => {
    await loginPage.login(usernameCorrect, passwordCorrect);
    await inventoryPage.assertIsOpened();
  })

  test('Login empty password', async ({loginPage}) => {
    await loginPage.login(usernameCorrect, '');
    await expect.soft(loginPage.errorMessage).toHaveText('Epic sadface: Password is required');
  })

  test('Login empty username', async ({loginPage}) => {
    await loginPage.login('', passwordCorrect);
    await expect.soft(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
  });

});

test('Add items to cart', async ({ loginPage, inventoryPage, cartPage }) => {
  const itemNames = ['Sauce Labs Backpack', 'Sauce Labs Bike Light'];

  await loginPage.openLoginPage();
  await loginPage.login(usernameCorrect, passwordCorrect);
  await inventoryPage.assertIsOpened();

  for (const item of itemNames) {
    await inventoryPage.addItemToCart(item);
  }

  await expect(inventoryPage.shoppingCartBadge).toHaveText('2');

  await inventoryPage.openCart();

  await cartPage.assertIsOpened();
  for (const item of itemNames) {
    await cartPage.assertItemAdded(item);
  }
  await cartPage.removeItemFromCart(itemNames[0]);
  await cartPage.assertItemNotPresent(itemNames[0]);
  await expect(cartPage.shoppingCartBadge).toHaveText('1');

});