import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CheckoutForm from '@/components/checkout/CheckoutForm';
import { getCartItems } from '@/lib/cart';

interface UserAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export default async function CheckoutPage() {
    const { userId } = auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const user = await currentUser();
    const cartItems = await getCartItems();

    if (!cartItems || cartItems.length === 0) {
        redirect('/cart');
    }

    // Extract user address from Clerk metadata
    const userAddress: UserAddress | null = user?.privateMetadata?.address as UserAddress || null;

    // Also get basic user info for pre-filling
    const userInfo = {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.emailAddresses?.[0]?.emailAddress || '',
        phone: user?.phoneNumbers?.[0]?.phoneNumber || userAddress?.phone || '',
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Checkout</h1>
                <CheckoutForm
                    cartItems={cartItems}
                    userAddress={userAddress}
                    userInfo={userInfo}
                />
            </div>
        </div>
    );
}
