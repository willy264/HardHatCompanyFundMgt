const { ethers } = require("hardhat");

async function main() {
    const [deployer, recipient, ...boardMembers] = await ethers.getSigners();

    // Deploy the contract with exactly 20 board members
    const memberAddresses = boardMembers.slice(0, 20).map(member => member.address);
    const CompanyFunds = await ethers.getContractFactory("CompanyFunds");
    const companyFunds = await CompanyFunds.deploy(memberAddresses);

    await companyFunds.deployed();
    console.log("CompanyFunds deployed to:", companyFunds.address);

    // Add funds to the contract
    const addFundsTx = await companyFunds.connect(deployer).addFunds({ value: ethers.utils.parseEther("10") });
    await addFundsTx.wait();
    console.log("Funds added: 10 ETH");

    // Request release of funds
    const requestReleaseTx = await companyFunds.connect(deployer).requestRelease();
    await requestReleaseTx.wait();
    console.log("Fund release requested");

    // Board members sign the release
    for (let i = 0; i < 20; i++) {
        const signTx = await companyFunds.connect(boardMembers[i]).signRelease();
        await signTx.wait();
        console.log(`Board member ${i + 1} signed the release`);
    }

    // Release the funds to the recipient
    const releaseFundsTx = await companyFunds.connect(deployer).releaseFunds(recipient.address);
    await releaseFundsTx.wait();
    console.log("Funds released to recipient");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
