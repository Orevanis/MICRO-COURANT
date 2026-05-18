#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalType {
    TariffAdjustment,
    SubsidyCreation,
    SubsidyModification,
    SubsidyTermination,
    FundAllocation,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VoteOption {
    Yes,
    No,
    Abstain,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub proposal_id: u64,
    pub proposal_type: ProposalType,
    pub title: String,
    pub description: String,
    pub proposer: Address,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub status: ProposalStatus,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub abstain_votes: u64,
    pub total_voters: u64,
    pub quorum_required: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Subsidy {
    pub subsidy_id: u64,
    pub name: String,
    pub description: String,
    pub discount_percentage: u32,
    pub eligible_households: Vec<Address>,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub active: bool,
    pub total_allocated: u64,
    pub total_distributed: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: u64,
    pub vote_option: VoteOption,
    pub timestamp: u64,
}

#[contract]
pub struct SubsidyGovernance;

#[contractimpl]
impl SubsidyGovernance {
    pub fn initialize(
        env: Env,
        admin: Address,
        governance_token: Address,
        voting_period_hours: u64,
        quorum_threshold: u32,
    ) {
        if env.storage().instance().has(&Symbol::new(&env, "ADMIN")) {
            panic!("already initialized");
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "ADMIN"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "GOV_TOKEN"), &governance_token);
        env.storage().instance().set(
            &Symbol::new(&env, "VOTING_PERIOD"),
            &(voting_period_hours * 3600),
        );
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "QUORUM_THRESH"), &quorum_threshold);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "COMMUNITY_FUND"), &0u64);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "PROPOSAL_CTR"), &0u64);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SUBSIDY_CTR"), &0u64);
    }

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        proposal_type: ProposalType,
        title: String,
        description: String,
    ) -> u64 {
        proposer.require_auth();

        let timestamp = env.ledger().timestamp();
        let voting_period: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "VOTING_PERIOD"))
            .unwrap();
        let proposal_counter: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "PROPOSAL_CTR"))
            .unwrap();
        let proposal_id = proposal_counter + 1;

        let proposal = Proposal {
            proposal_id,
            proposal_type,
            title,
            description,
            proposer: proposer.clone(),
            start_timestamp: timestamp,
            end_timestamp: timestamp + voting_period,
            status: ProposalStatus::Active,
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            total_voters: 0,
            quorum_required: 5000,
        };

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "PROPOSALS"))
            .unwrap_or_else(|| Map::new(&env));
        proposals.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "PROPOSALS"), &proposals);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "PROPOSAL_CTR"), &proposal_id);

        env.events().publish(
            (Symbol::new(&env, "PROP_CREATED"), proposer),
            proposal_id,
        );

        proposal_id
    }

    pub fn cast_vote(env: Env, voter: Address, proposal_id: u64, vote_option: VoteOption) {
        voter.require_auth();

        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "PROPOSALS"))
            .unwrap();
        let mut proposal = proposals
            .get(proposal_id)
            .unwrap_or_else(|| panic!("proposal not found"));

        if proposal.status != ProposalStatus::Active {
            panic!("proposal is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp > proposal.end_timestamp {
            panic!("voting period has ended");
        }

        let votes: Map<(Address, u64), Vote> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "VOTES"))
            .unwrap_or_else(|| Map::new(&env));
        if votes.contains_key(&(voter.clone(), proposal_id)) {
            panic!("already voted");
        }

        let vote = Vote {
            voter: voter.clone(),
            proposal_id,
            vote_option: vote_option.clone(),
            timestamp,
        };

        let mut votes_updated = votes;
        votes_updated.set((voter.clone(), proposal_id), vote);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "VOTES"), &votes_updated);

        match vote_option {
            VoteOption::Yes => proposal.yes_votes += 1,
            VoteOption::No => proposal.no_votes += 1,
            VoteOption::Abstain => proposal.abstain_votes += 1,
        }
        proposal.total_voters += 1;

        let mut proposals_updated = proposals;
        proposals_updated.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "PROPOSALS"), &proposals_updated);

        env.events().publish(
            (Symbol::new(&env, "VOTE_CAST"), voter),
            (proposal_id, vote_option),
        );
    }

    pub fn finalize_proposal(env: Env, proposal_id: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "PROPOSALS"))
            .unwrap();
        let mut proposal = proposals
            .get(proposal_id)
            .unwrap_or_else(|| panic!("proposal not found"));

        if proposal.status != ProposalStatus::Active {
            panic!("proposal is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp <= proposal.end_timestamp {
            panic!("voting period has not ended");
        }

        let quorum_threshold: u32 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "QUORUM_THRESH"))
            .unwrap();
        let quorum_met = (proposal.total_voters * 10000) >= (quorum_threshold as u64);

        proposal.status = if quorum_met && proposal.yes_votes > proposal.no_votes {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };

        let yes = proposal.yes_votes;
        let no = proposal.no_votes;
        let status = proposal.status.clone();

        let mut proposals_updated = proposals;
        proposals_updated.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "PROPOSALS"), &proposals_updated);

        if status == ProposalStatus::Passed {
            env.events().publish(
                (Symbol::new(&env, "PROP_PASSED"), proposal_id),
                (yes, no),
            );
        } else {
            env.events().publish(
                (Symbol::new(&env, "PROP_REJECTED"), proposal_id),
                (yes, no),
            );
        }
    }

    pub fn create_subsidy(
        env: Env,
        name: String,
        description: String,
        discount_percentage: u32,
        eligible_households: Vec<Address>,
        duration_hours: u64,
        allocated_amount: u64,
    ) -> u64 {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();

        let subsidy_counter: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "SUBSIDY_CTR"))
            .unwrap();
        let subsidy_id = subsidy_counter + 1;
        let timestamp = env.ledger().timestamp();

        let subsidy = Subsidy {
            subsidy_id,
            name: name.clone(),
            description,
            discount_percentage,
            eligible_households,
            start_timestamp: timestamp,
            end_timestamp: timestamp + (duration_hours * 3600),
            active: true,
            total_allocated: allocated_amount,
            total_distributed: 0,
        };

        let mut subsidies: Map<u64, Subsidy> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "SUBSIDIES"))
            .unwrap_or_else(|| Map::new(&env));
        subsidies.set(subsidy_id, subsidy);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SUBSIDIES"), &subsidies);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SUBSIDY_CTR"), &subsidy_id);

        env.events()
            .publish((Symbol::new(&env, "SUBSIDY_CREATED"),), (subsidy_id, name));

        subsidy_id
    }

    pub fn apply_subsidy(
        env: Env,
        subsidy_id: u64,
        household_address: Address,
        consumption_kwh: u64,
    ) -> u64 {
        let subsidies: Map<u64, Subsidy> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "SUBSIDIES"))
            .unwrap();
        let mut subsidy = subsidies
            .get(subsidy_id)
            .unwrap_or_else(|| panic!("subsidy not found"));

        if !subsidy.active {
            panic!("subsidy is not active");
        }

        let timestamp = env.ledger().timestamp();
        if timestamp > subsidy.end_timestamp {
            panic!("subsidy has expired");
        }

        let mut eligible = false;
        for addr in subsidy.eligible_households.iter() {
            if addr == household_address {
                eligible = true;
                break;
            }
        }
        if !eligible {
            panic!("household not eligible");
        }

        let base_cost = consumption_kwh * 100;
        let discount = (base_cost * subsidy.discount_percentage as u64) / 10000;
        subsidy.total_distributed = subsidy.total_distributed.saturating_add(discount);

        let mut subsidies_updated = subsidies;
        subsidies_updated.set(subsidy_id, subsidy);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "SUBSIDIES"), &subsidies_updated);

        env.events().publish(
            (Symbol::new(&env, "SUBSIDY_APPLIED"), household_address),
            (subsidy_id, discount),
        );

        discount
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "PROPOSALS"))
            .unwrap();
        proposals
            .get(proposal_id)
            .unwrap_or_else(|| panic!("proposal not found"))
    }

    pub fn get_subsidy(env: Env, subsidy_id: u64) -> Subsidy {
        let subsidies: Map<u64, Subsidy> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "SUBSIDIES"))
            .unwrap();
        subsidies
            .get(subsidy_id)
            .unwrap_or_else(|| panic!("subsidy not found"))
    }

    pub fn get_community_fund(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "COMMUNITY_FUND"))
            .unwrap()
    }

    pub fn add_to_fund(env: Env, amount: u64) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap();
        admin.require_auth();
        let current: u64 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "COMMUNITY_FUND"))
            .unwrap();
        env.storage().instance().set(
            &Symbol::new(&env, "COMMUNITY_FUND"),
            &current.saturating_add(amount),
        );
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "ADMIN"))
            .unwrap()
    }
}
