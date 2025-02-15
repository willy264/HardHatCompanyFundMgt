import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("CompanyFunds", function () {
    async function deployFixture() {
        const [owner, recipient, ...boardMembers] = await hre.ethers.getSigners();
        const memberAddresses = boardMembers.slice(0, 20).map(member => member.address);

        const CompanyFunds = await hre.ethers.getContractFactory("CompanyFunds");
        const contract = await CompanyFunds.deploy(memberAddresses);

        return { contract, owner, recipient, boardMembers };
    }

    describe('deployment', () => {
        it("should deploy", async () => {
            let {contract} = await loadFixture(deployFixture);
            expect(contract).to.not.be.equal(null);
        })       
    })


    describe('should add funds', () => { 
        it('should deposit', async() => {
            const {contract} = await loadFixture(deployFixture);
            let depositAmount = hre.ethers.parseEther("1");
            let depositBefore = await contract.funds();
            await contract.addFunds({value: depositAmount});
            let depositAfter = await contract.funds() ;
            expect(depositAfter).to.be.greaterThanOrEqual(depositBefore);
        })
    })

    it("should request fund release", async function () {
        const { contract, owner } = await loadFixture(deployFixture);
        await contract.connect(owner).addFunds({ value: hre.ethers.parseEther("5") });
        await contract.connect(owner).requestRelease();
        expect(await contract.releaseRequested()).to.be.true;
    });

    it("should allow all board members to sign", async function () {
        const { contract, boardMembers, owner } = await loadFixture(deployFixture);
        await contract.connect(owner).addFunds({ value: hre.ethers.parseEther("5") });
        await contract.connect(owner).requestRelease();

        for (let i = 0; i < 20; i++) {
            await contract.connect(boardMembers[i]).signRelease();
            expect(await contract.hasSigned(boardMembers[i].address)).to.be.true;
        }
        expect(await contract.signatureCount()).to.equal(20);
    });

    it("should release funds after all signatures", async function () {
        const { contract, owner, recipient, boardMembers } = await loadFixture(deployFixture);
        await contract.connect(owner).addFunds({ value: hre.ethers.parseEther("10") });
        await contract.connect(owner).requestRelease();

        for (let i = 0; i < 20; i++) {
            await contract.connect(boardMembers[i]).signRelease();
        }

        const recipientInitialBalance = await hre.ethers.provider.getBalance(recipient.address);
        await contract.connect(owner).releaseFunds(recipient.address);

        const recipientFinalBalance = await hre.ethers.provider.getBalance(recipient.address);
        expect(recipientFinalBalance).to.be.gt(recipientInitialBalance);
    });

    it("should revert if non-board member tries to sign", async function () {
        const { contract, owner } = await loadFixture(deployFixture);
        await expect(contract.connect(owner).signRelease()).to.be.revertedWithCustomError(contract, "NotBoardMember");
    });
});
