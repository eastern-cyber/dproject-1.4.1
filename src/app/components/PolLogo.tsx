import { TokenProvider, TokenIcon } from "thirdweb/react";
import { client } from "@/lib/client";
import { chain } from "@/lib/chain";

const TokenPOL: React.FC = () => {
    return (
        <TokenProvider
        address={"0xca23b56486035e14F344d6eb591DC27274AF3F47"}
        client={client}
        chain={chain}
        >
        <TokenIcon className="h-6 w-6 rounded-full mr-1" />
        </TokenProvider>
    );
};
export default TokenPOL;