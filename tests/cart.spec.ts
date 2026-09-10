import { test, expect} from '../fixtures/fixtures';

test.describe('Cart', () => {

  test('reflects items added and removed', async ({ inventoryPage, cartPage }) => {
    const itemNames = ['Sauce Labs Backpack', 'Sauce Labs Bike Light'];

    await inventoryPage.openInventoryPage();
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

});
