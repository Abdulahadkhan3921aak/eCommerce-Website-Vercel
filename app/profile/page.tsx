import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';

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

export default async function ProfilePage() {
    const { userId } = auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const user = await currentUser();

    if (!user) {
        redirect('/sign-in');
    }

    const userAddress: UserAddress | null = user.privateMetadata?.address as UserAddress || null;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
                <ProfileForm user={user} userAddress={userAddress} />
            </div>
        </div>
    );
}
