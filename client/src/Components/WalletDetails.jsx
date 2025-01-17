import PropTypes from "prop-types";

export const WalletDetails = ({ wallet }) => {
  return (
    <div className="items-center justify-center space-y-4">
      <td className=" px-6 pt-3">Add: {wallet.account.address.slice(0, 5)}</td>
    </div>
  );
};

WalletDetails.propTypes = {
  wallet: PropTypes.shape({
    account: PropTypes.shape({
      address: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
