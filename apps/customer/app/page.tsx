import { CustomerChat } from '../components/customer-chat';
import { FixtureCustomerChat } from '../components/fixture-customer-chat';
export default function Page() { return process.env.NEXT_PUBLIC_USE_FIXTURES === '1' ? <FixtureCustomerChat /> : <CustomerChat />; }
