import { test, expect} from '../fixtures/fixtures';

const usernameCorrect = 'standard_user';
const passwordCorrect = 'secret_sauce';

test.describe('Login', () => {

  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({loginPage}) => {
    await loginPage.openLoginPage();
  });

  test('signs a valid user in to the inventory page', async ({loginPage, inventoryPage}) => {
    await loginPage.login(usernameCorrect, passwordCorrect);
    await inventoryPage.assertIsOpened();
  })

  test('rejects an empty password', async ({loginPage}) => {
    await loginPage.login(usernameCorrect, '');
    await expect.soft(loginPage.errorMessage).toHaveText('Epic sadface: Password is required');
  })

  test('rejects an empty username', async ({loginPage}) => {
    await loginPage.login('', passwordCorrect);
    await expect.soft(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
  });

});
